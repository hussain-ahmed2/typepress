import type { NextConfig } from 'next';

const next_config: NextConfig = {
  // Transpile workspace packages consumed as TypeScript source.
  transpilePackages: ['@typepress/shared-types', '@typepress/theme-sdk'],
};

export default next_config;
