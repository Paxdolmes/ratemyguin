/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // a static site, served from Cloudflare Pages
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
