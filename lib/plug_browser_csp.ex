defmodule BrowserCSP do
  @behaviour Plug
  import Plug.Conn

  @moduledoc """
  This module is a Plug that sets the Content Security Policy (CSP) headers
  For WASM ressource, you need "wasm-unsafe-eval" in the script-src directive.
  """

  # Two years in seconds (recommended for preload)
  @hsts_max_age 63_072_000

  @impl true
  def init(opts), do: opts

  defp generate_nonce do
    :crypto.strong_rand_bytes(16) |> Base.encode16(case: :lower)
  end

  @impl true
  def call(conn, _opts) do
    # main_nonce = Application.fetch_env!(:solidyjs, :csp_nonce)
    main_nonce = generate_nonce()

    conn
    |> put_resp_header("content-security-policy", build_csp(main_nonce))
    |> put_resp_header(
      "strict-transport-security",
      "max-age=#{@hsts_max_age}; includeSubDomains; preload"
    )
    |> put_resp_header("cross-origin-opener-policy", "same-origin")
    # -> assign available and populated in "root.html.heex"
    |> assign(:main_nonce, main_nonce)
  end

  defp build_csp(nonce) do
    case config_env() do
      :prod ->
        """
          require-trusted-types-for 'script';
          script-src 'self' 'nonce-#{nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://cdn.maptiler.com/;
          object-src 'none';
          connect-src 'self' http://localhost:* https://solidyjs-lively-pine-4375.fly.dev wss://solidyjs-lively-pine-4375.fly.dev ws://solidyjs-lively-pine-4375.fly.dev ws://localhost:* https://api.maptiler.com/ https://*.maptiler.com/;
          img-src 'self' data: https://*.maptiler.com/ https://api.maptiler.com/ http://localhost:4000;
          worker-src 'self' blob:;
          style-src 'self' 'unsafe-inline';
          default-src 'self' https://solidyjs-lively-pine-4375.fly.dev;
          frame-ancestors 'self' https://solidyjs-lively-pine-4375.fly.dev;
          base-uri 'self'
        """
        |> String.replace("\n", " ")

      _ ->
        """
          require-trusted-types-for 'script';
          script-src 'self' 'nonce-#{nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://cdn.maptiler.com/;
          object-src 'none';
          connect-src 'self' http://localhost:* ws://localhost:* https://api.maptiler.com/ https://*.maptiler.com/;img-src 'self' data: https://*.maptiler.com/ https://api.maptiler.com/;worker-src 'self' blob:;
          style-src 'self' 'unsafe-inline';
          default-src 'self';
          frame-ancestors 'self' http://localhost:*;
          base-uri 'self'
        """
        |> String.replace("\n", " ")
    end
  end
end
