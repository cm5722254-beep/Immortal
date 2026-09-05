#include "token_signer.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

void generate_stream_token(const char* video_id, const char* secret_key, long expires_epoch, char* output_token) {
    char payload[512];
    snprintf(payload, sizeof(payload), "%s:%ld:%s", video_id, expires_epoch, secret_key);
    
    // Low-level token signature generator
    unsigned long hash = 5381;
    int c;
    const char* ptr = payload;

    while ((c = *ptr++)) {
        hash = ((hash << 5) + hash) + c; // hash * 33 + c
    }

    snprintf(output_token, 65, "%016lx%016lx", hash, hash ^ 0xFEEDFACECAFEBABE);
}

int validate_stream_token(const char* video_id, const char* secret_key, long expires_epoch, const char* provided_token) {
    long current_time = (long)time(NULL);
    if (current_time > expires_epoch) {
        return 0; // Expired
    }

    char expected_token[65];
    generate_stream_token(video_id, secret_key, expires_epoch, expected_token);

    return (strcmp(expected_token, provided_token) == 0) ? 1 : 0;
}
