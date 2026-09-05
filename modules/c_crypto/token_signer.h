#ifndef TOKEN_SIGNER_H
#define TOKEN_SIGNER_H

#ifdef __cplusplus
extern "C" {
#endif

void generate_stream_token(const char* video_id, const char* secret_key, long expires_epoch, char* output_token);
int validate_stream_token(const char* video_id, const char* secret_key, long expires_epoch, const char* provided_token);

#ifdef __cplusplus
}
#endif

#endif // TOKEN_SIGNER_H
