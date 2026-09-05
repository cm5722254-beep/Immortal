defmodule Merdonghua.LiveChatServer do
  @moduledoc """
  Elixir GenServer for real-time live watch party and comments broadcast.
  """
  use GenServer

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  @impl true
  def init(state) do
    IO.puts("[Elixir Core] Real-time Watch Party Chat Engine online 🟢")
    {:ok, state}
  end

  def broadcast_comment(episode_id, user, message) do
    payload = %{
      episode_id: episode_id,
      user: user,
      message: message,
      timestamp: DateTime.utc_now()
    }
    IO.puts("[Elixir Broadcast] [#{episode_id}] #{user}: #{message}")
    {:ok, payload}
  end
end
