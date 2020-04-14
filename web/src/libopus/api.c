#include <stdlib.h>
#include <stdio.h>
#include "emscripten.h"
#include "opus.h"

EMSCRIPTEN_KEEPALIVE
const char* version() {
    return opus_get_version_string();
}

EMSCRIPTEN_KEEPALIVE
OpusDecoder* new_decoder(int Fs, int channels) {
    int err;
    OpusDecoder* decoder;
    decoder = opus_decoder_create(Fs, channels, &err);

    if (err != OPUS_OK || decoder == NULL) {
        printf("Failed to create decoder (%d)\n", err);
        return NULL;
    }

    return decoder;
}

EMSCRIPTEN_KEEPALIVE
void destroy_decoder(OpusDecoder* decoder) {
    opus_decoder_destroy(decoder);
}

EMSCRIPTEN_KEEPALIVE
float* decode_float(OpusDecoder* decoder, uint8_t* packet, int packet_size, int interleaved_size) {
    float* interleaved = malloc(interleaved_size * sizeof(float));
    if (interleaved == NULL) {
        printf("Couldn't allocate memory.\n");
    }
    
    int err = opus_decode_float(decoder, packet, packet_size, interleaved, interleaved_size, 0);

    if (err == -1 || decoder == NULL) {
        printf("Failed to decode (%d)\n", err);
        return NULL;
    }

    return interleaved;
}

EMSCRIPTEN_KEEPALIVE
float* deinterleave(float* interleaved, int frame_size, int channels) {
    float* linear = malloc(frame_size * channels * sizeof(float));
    if (linear == NULL) {
        printf("Couldn't allocate memory.\n");
    }

    for (int c = 0; c < channels; c++) {
        for (int i = 0; i < frame_size; i++) {
            linear[i+frame_size*c] = interleaved[channels*i+c];
        }
    }

    return linear;
}

EMSCRIPTEN_KEEPALIVE
float* decode_float_linear(OpusDecoder* decoder, uint8_t* packet, int packet_size, int frame_size, int channels) {
    float* interleaved = decode_float(decoder, packet, packet_size, frame_size*channels);
    float* linear = deinterleave(interleaved, frame_size, channels);
    free(interleaved);
    return linear;
}