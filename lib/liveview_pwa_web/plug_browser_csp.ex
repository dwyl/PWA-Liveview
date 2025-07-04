defmodule BrowserCSP do
  @moduledoc """
  This module is a Plug that sets the Content Security Policy (CSP) headers
  For WASM ressource, you need "wasm-unsafe-eval" in the script-src directive.
  """
  @behaviour Plug

  import Plug.Conn

  # Two years in seconds (recommended for preload)
  @hsts_max_age 63_072_000

  @impl true
  def init(opts), do: opts

  defp generate_nonce do
    :crypto.strong_rand_bytes(16) |> Base.encode16(case: :lower)
  end

  @impl true
  def call(conn, _opts) do
    # main_nonce = Application.fetch_env!(:liveview_pwa, :csp_nonce)
    main_nonce = generate_nonce()
    style_nonce = generate_nonce()

    conn
    |> put_resp_header("content-security-policy", build_csp(main_nonce, style_nonce))
    |> put_resp_header(
      "strict-transport-security",
      "max-age=#{@hsts_max_age}; includeSubDomains; preload"
    )
    |> put_resp_header("cross-origin-opener-policy", "same-origin")
    # -> assign available and populated in "root.html.heex"
    |> assign(:main_nonce, main_nonce)
    |> assign(:style_nonce, style_nonce)
  end

  defp build_csp(nonce1, nonce2) do
    """
      script-src 'self' 'nonce-#{nonce1}' 'nonce-#{nonce2}' 'strict-dynamic' 'wasm-unsafe-eval' http://localhost:5173/ https://unpkg.com/leaflet@1.9.4/dist/leaflet.css https://cdn.maptiler.com/  https://solidjs-lively-pine-4375.fly.dev https://*.maptiler.com/ https://api.maptiler.com/ http://localhost:* ws://localhost:* wss://solidyjs-lively-pine-4375.fly.dev;
      object-src 'none';
      connect-src 'self' http://localhost:5173/ http://localhost:* https://solidyjs-lively-pine-4375.fly.dev wss://solidyjs-lively-pine-4375.fly.dev ws://solidyjs-lively-pine-4375.fly.dev ws://localhost:* https://api.maptiler.com/ https://*.maptiler.com/;
      img-src 'self' data: http://localhost:5173/ https://*.maptiler.com/ https://api.maptiler.com/ http://localhost:4000 https://leafletjs.com;
      worker-src 'self' blob:;
      style-src 'self'  'unsafe-inline' http://localhost:5173/ https://unpkg.com/leaflet@1.9.4/dist/leaflet.css;
      default-src 'self' http://localhost:5173/ https://solidjs-lively-pine-4375.fly.dev;
      frame-ancestors 'self' http://localhost:5173/ https://solidyjs-lively-pine-4375.fly.dev;
      font-src 'self' https://fonts.maptiler.com;
      base-uri 'self' http://localhost:5173/
    """
    |> String.replace("\n", " ")

    # style-src: 'unsafe-inline'

    # _ ->
    #   """
    #     require-trusted-types-for 'script';
    #     script-src 'self' 'nonce-#{nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://cdn.maptiler.com/;
    #     object-src 'none';
    #     connect-src 'self' http://localhost:* ws://localhost:* https://api.maptiler.com/ https://*.maptiler.com/;img-src 'self' data: https://*.maptiler.com/ https://api.maptiler.com/;worker-src 'self' blob:;
    #     style-src 'self' 'unsafe-inline';
    #     default-src 'self';
    #     frame-ancestors 'self' http://localhost:*;
    #     base-uri 'self'
    #   """
    #   |> String.replace("\n", " ")
    # end
  end
end
