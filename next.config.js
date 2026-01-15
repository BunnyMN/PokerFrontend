/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ensure CSS is properly handled in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Ensure all CSS is included in production build
  productionBrowserSourceMaps: false,
  // Optimize CSS output
  optimizeFonts: true,
  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
  },
  // Webpack configuration for better performance and Supabase compatibility
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // Handle Supabase ESM modules (.mjs files)
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    })
    
    // Better handling of ESM modules
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.js'],
    }
    
    // Suppress Supabase wrapper.mjs warnings (known issue, doesn't affect functionality)
    const originalWarnings = config.ignoreWarnings || []
    config.ignoreWarnings = [
      ...originalWarnings,
      {
        module: /node_modules\/@supabase\/supabase-js/,
        message: /does not contain a default export/,
      },
      {
        module: /node_modules\/@supabase\/supabase-js\/dist\/esm\/wrapper\.mjs/,
      },
      // Suppress webpack cache performance warnings (not critical, just optimization suggestions)
      {
        message: /Serializing big strings.*impacts deserialization performance/,
      },
    ]
    
    return config
  },
}

module.exports = nextConfig
