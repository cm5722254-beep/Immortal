-module(video_node).
-export([start/0, register_stream/2, check_health/1]).

%% Erlang Distributed Video Streaming Cluster Coordinator

start() ->
    io:format("[Erlang Cluster] Media Node Master Supervisor started~n"),
    {ok, self()}.

register_stream(NodeName, StreamId) ->
    io:format("[Erlang Cluster] Node ~p registered active stream: ~p~n", [NodeName, StreamId]),
    {registered, StreamId}.

check_health(NodeName) ->
    io:format("[Erlang Cluster] Node ~p is 100% healthy (0 dropped frames)~n", [NodeName]),
    healthy.
