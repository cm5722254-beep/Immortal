#pragma once
#include <string>
#include <vector>

namespace Merdonghua {

class VideoProcessor {
public:
    explicit VideoProcessor(const std::string& inputPath);
    bool inspectMedia();
    std::string extractThumbnail(double timestampSeconds, const std::string& outputPath);
    std::vector<std::string> generateHlsChunks(int segmentLengthSeconds);

private:
    std::string m_filePath;
    double m_durationSeconds;
    int m_bitrateKbps;
};

} // namespace Merdonghua
