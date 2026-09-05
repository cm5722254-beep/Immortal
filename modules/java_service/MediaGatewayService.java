package com.merdonghua.gateway;

import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

public class MediaGatewayService {
    private static final Logger logger = Logger.getLogger(MediaGatewayService.class.getName());
    private final ConcurrentHashMap<String, Long> activeSessions = new ConcurrentHashMap<>();

    public void registerSession(String userId, String episodeId) {
        String sessionKey = userId + "_" + episodeId;
        activeSessions.put(sessionKey, System.currentTimeMillis());
        logger.info("[Java Gateway] Registered video session for user: " + userId);
    }

    public boolean isSessionValid(String userId, String episodeId) {
        String sessionKey = userId + "_" + episodeId;
        Long start = activeSessions.get(sessionKey);
        if (start == null) return false;
        return (System.currentTimeMillis() - start) < (3600 * 1000); // 1 hour valid
    }

    public int getActiveStreamCount() {
        return activeSessions.size();
    }
}
