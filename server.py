from SoapySDR import SOAPY_SDR_RX, SOAPY_SDR_CF32
from zmq.asyncio import Context, Poller
from radio.analog import WBFM
from radio.tools import Tuner

import zmq
import json
import asyncio
import opuslib
import importlib
import SoapySDR
import numpy as np


# Settings (add to yml)
tau = 75e-6
sfs = int(240e3)
afs = int(48e3)
ofs = int(1920)
cuda = True

radios = [
    {"freq": 97.5e6, "bw": sfs, "afs": afs },
    { "freq": 95.5e6, "bw": sfs, "afs": afs },
    { "freq": 94.5e6, "bw": sfs, "afs": afs },
    { "freq": 96.9e6, "bw": sfs, "afs": afs },
]

# ZeroMQ Declaration
url = 'ws://0.0.0.0:'
ctx = Context.instance()
ctx.setsockopt(zmq.IPV6, True)

# Radio-Core Declaration
tuner = Tuner(radios, cuda=cuda)
demod = WBFM(tau, sfs, afs, sfs, cuda=cuda)
queue = asyncio.Queue()
sdr_buff = 1024

# OPUS Declaration
opus = opuslib.Encoder(afs, 2, opuslib.APPLICATION_AUDIO)

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


async def meta():
    socket = ctx.socket(zmq.REP)
    socket.bind(url + "5556")

    while True:
        message = await socket.recv()
        message = message.decode("utf-8")
        
        if message == 'radios':
            payload = json.dumps(radios)
            await socket.send(payload.encode("utf-8"))


async def blast():
    socket = ctx.socket(zmq.PUB)
    socket.bind(url + "5555")

    while True:
        buffer = await queue.get()
        tuner.load(buffer) 

        for i, f in enumerate(radios):
            L, R = demod.run(tuner.run(i))
            audio = np.ravel(np.column_stack((L, R))).astype(np.float32)
            address = int(f['freq']).to_bytes(4, byteorder='little')

            for i in range(afs//ofs):
                frame = audio[(i*ofs*2):((i+1)*ofs*2)]
                encoded = opus.encode_float(frame.tobytes(), len(frame)//2)
                await socket.send_multipart([address, encoded])


async def radio():
    while True:
        for i in range(tuner.size//sdr_buff):
            sdr.readStream(rx, [buff[(i*sdr_buff):]], sdr_buff, timeoutUs=int(1e9))
        await queue.put(buff.astype(np.complex64))
        await asyncio.sleep(0.1)


# Blast Settings
print("# Blast Settings:")
print("     Bandwidth: {}".format(tuner.bw))
print("     Mean Frequency: {}".format(tuner.mdf))
print("     Offsets: {}".format(tuner.foff))
print("     Radios: {}".format(len(radios)))

# Start Collecting Data
rx = sdr.setupStream(SOAPY_SDR_RX, SOAPY_SDR_CF32)
sdr.activateStream(rx)


# Start Asyncio
def exception_handler(loop, context):
    #loop.default_exception_handler(context)
    print(context)
    loop.stop()


loop = asyncio.get_event_loop()
loop.set_exception_handler(exception_handler)
loop.run_until_complete(asyncio.wait([
    meta(),
    blast(),
    radio(),
]))