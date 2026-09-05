<?php
/**
 * PHP Fallback Mirror API & Webhook Handler
 */

header('Content-Type: application/json');

class MirrorRouter {
    private $mirrors = [
        "primary" => "https://pub-r2.merdonghua.com",
        "backup_asia" => "https://backup-sg.merdonghua.com",
        "backup_us" => "https://backup-us.merdonghua.com"
    ];

    public function resolveOptimalMirror($clientIp = '127.0.0.1') {
        return [
            "status" => "success",
            "optimal_endpoint" => $this->mirrors["primary"],
            "fallback" => $this->mirrors["backup_asia"],
            "timestamp" => time()
        ];
    }
}

$router = new MirrorRouter();
$response = $router->resolveOptimalMirror();
echo json_encode($response, JSON_PRETTY_PRINT);
