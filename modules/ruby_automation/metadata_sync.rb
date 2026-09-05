# Ruby Anime Metadata & Release Automation Tool
require 'json'
require 'time'

class DonghuaReleaseManager
  attr_reader :releases

  def initialize
    @releases = []
  end

  def add_episode(title, episode_num, release_time = Time.now)
    item = {
      title: title,
      episode: episode_num,
      released_at: release_time.iso8601,
      status: "Published"
    }
    @releases << item
    puts "[Ruby Automation] Registered release: #{title} Episode #{episode_num}"
  end

  def export_manifest
    JSON.pretty_generate({ total: @releases.size, items: @releases })
  end
end

if __FILE__ == $0
  manager = DonghuaReleaseManager.new
  manager.add_episode("Shrouding the Heavens", 98)
  manager.add_episode("Perfect World", 215)
  puts manager.export_manifest
end
