from SoapySDR import SOAPY_SDR_RX, SOAPY_SDR_CF32
from zmq.asyncio import Context, Poller
from radio.analog import WBFM
from radio.tools import Tuner

import json
import asyncio
import opuslib
import socketio
import importlib
import SoapySDR
import numpy as np
from aiohttp import web
import aiohttp_cors


# Settings (add to yml)
tau = 75e-6
sfs = int(240e3)
afs = int(48e3)
ofs = int(1920)
cuda = True
version = "1.0"

stations = [
    { "freq": 96.9e6, "bw": sfs, "afs": afs, "ofs": ofs, "chs": 2, "codec": opuslib.APPLICATION_AUDIO},
    { "freq": 94.5e6, "bw": sfs, "afs": afs, "ofs": ofs, "chs": 2, "codec": opuslib.APPLICATION_AUDIO},
    { "freq": 97.5e6, "bw": sfs, "afs": afs, "ofs": ofs, "chs": 2, "codec": opuslib.APPLICATION_AUDIO},
]

# ZeroMQ Declaration
url = '*'
port = 8080
sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

# Radio-Core Declaration
tuner = Tuner(stations, sfs, cuda=cuda)
demod = [WBFM(tau, r['bw'], r['afs'], r['bw'], cuda=cuda) for r in stations]
queue = asyncio.Queue()
sdr_buff = 1200

# OPUS Declaration
opus = [opuslib.Encoder(r['afs'], r['chs'], r['codec']) for r in stations]

# Radio Declaration
args = dict(driver="lime")
sdr = SoapySDR.Device(args)
sdr.setGainMode(SOAPY_SDR_RX, 0, True)
sdr.setSampleRate(SOAPY_SDR_RX, 0, tuner.bw)
sdr.setFrequency(SOAPY_SDR_RX, 0, tuner.mdf)

# Buffer Declaration
if cuda:
    sig = importlib.import_module('cusignal')
    buff = sig.get_shared_mem(tuner.size, dtype=np.complex64)
else:
    buff = np.zeros([tuner.size], dtype=np.complex64)
    

async def blast():   
    while True:
        buffer = await queue.get()
        tuner.load(buffer) 

        for ir, f in enumerate(stations):
            L, R = demod[ir].run(tuner.run(ir))
            audio = np.ravel(np.column_stack((L, R))).astype(np.float32)
            address = str(int(f['freq']))

            for io in range(afs//ofs):
                frame = audio[(io*ofs*2):((io+1)*ofs*2)]
                encoded = opus[ir].encode_float(frame.tobytes(), len(frame)//2)
                await sio.emit('data', encoded, room=address)
                
        await asyncio.sleep(0.1)

async def radio():
    while True:
        for i in range(tuner.size//sdr_buff):
            sdr.readStream(rx, [buff[(i*sdr_buff):]], sdr_buff, timeoutUs=int(1e9))
        await queue.put(buff.astype(np.complex64))
        await asyncio.sleep(0.1)


# Blast Settings
print("# Blast Settings:")
print("     URL: {}".format(url))
print("     Port: {}".format(port))
print("     Bandwidth: {}".format(tuner.bw))
print("     Mean Frequency: {}".format(tuner.mdf))
print("     Offsets: {}".format(tuner.foff))
print("     Stations: {}".format(len(stations)))

# Start Collecting Data
rx = sdr.setupStream(SOAPY_SDR_RX, SOAPY_SDR_CF32)
sdr.activateStream(rx)


# Start Asyncio
def exception_handler(loop, context):
    #loop.default_exception_handler(context)
    print(context)
    loop.stop()

@sio.on('join')
async def join(sid, message):
    sio.enter_room(sid, str(message))
    print("Adding SID", sid, "to room", str(message))

@sio.on('leave')
async def leave(sid, message):
    sio.leave_room(sid, str(message))
    print("Removing SID", sid, "to room", str(message))

routes = web.RouteTableDef()

cors = aiohttp_cors.setup(app, defaults={
    "*": aiohttp_cors.ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*",
    )
})

@routes.get('/meta')
async def serve_meta(request):
    return web.json_response({
        'name': 'PU2SPY - Jetson Nano',
        'device': 'LimeSDR Mini',
        'backend': 'cuSignal (GPU)' if cuda else 'Scipy Signal (CPU)',
        'stations': stations, 
        'version': version,
    })

async def serve():
    app.add_routes(routes)

    for route in list(app.router.routes()):
        if route._resource.canonical not in '/socket.io/':
            cors.add(route)

    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, url, port).start()

loop = asyncio.get_event_loop()
loop.set_exception_handler(exception_handler)
loop.run_until_complete(asyncio.wait([
    serve(),
    blast(),
    radio(),
]))