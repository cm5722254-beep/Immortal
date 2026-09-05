package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// StreamProxy handles concurrent video streaming requests with range support
type StreamProxy struct {
	upstreamURL string
	httpClient  *http.Client
}

func NewStreamProxy(upstream string) *StreamProxy {
	return &StreamProxy{
		upstreamURL: upstream,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (p *StreamProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	targetURL := fmt.Sprintf("%s%s", p.upstreamURL, r.URL.Path)

	req, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, nil)
	if err != nil {
		http.Error(w, "Failed to create upstream request", http.StatusInternalServerError)
		return
	}

	// Forward Range Header for smooth video seeking
	if rangeHeader := r.Header.Get("Range"); rangeHeader != "" {
		req.Header.Set("Range", rangeHeader)
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		http.Error(w, "Streaming proxy error", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy headers
	for k, v := range resp.Header {
		w.Header()[k] = v
	}
	w.WriteHeader(resp.StatusCode)

	// Stream video buffer directly to client
	_, _ = io.Copy(w, resp.Body)
}

func main() {
	proxy := NewStreamProxy("https://pub-r2.merdonghua.com")
	http.Handle("/stream/", proxy)

	log.Println("⚡ High-performance Go Video Stream Proxy running on :8080")
	_ = http.ListenAndServe(":8080", nil)
}
