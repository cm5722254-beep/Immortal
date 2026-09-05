import Foundation
import AVKit

public struct DonghuaEpisode {
    public let id: String
    public let name: String
    public let streamUrl: URL
}

public class MerdonghuaIOSPlayerController: NSObject {
    private var player: AVPlayer?
    private var isAirPlayActive: Bool = false

    public func loadVideo(episode: DonghuaEpisode) {
        print("[Swift iOS Native] Loading AVPlayer stream: \(episode.name)")
        let playerItem = AVPlayerItem(url: episode.streamUrl)
        self.player = AVPlayer(playerItem: playerItem)
    }

    public func toggleAirPlay() {
        self.isAirPlayActive.toggle()
        print("[Swift iOS Native] AirPlay state changed: \(self.isAirPlayActive)")
    }

    public func enablePictureInPicture() -> Bool {
        print("[Swift iOS Native] Enabling iOS Native AVPictureInPictureController")
        return AVPictureInPictureController.isPictureInPictureSupported()
    }
}
