import nextConfig from 'eslint-config-next'
import noBrandLightOnLight from '../../ummat/apps/brand/src/eslint-rule-no-brand-light-on-light.js'

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['public/**', 'coverage/**'],
  },
  // C-09a-FIX-01: brand contrast guard — block text-brand-light / text-brand-mid in JSX/TSX.
  // These fail WCAG 2.2 AA on white/light surfaces (1.28:1 and 2.18:1 respectively).
  // Use text-brand-600 (#5A9438, 4.5:1) or text-brand-on-light (#0D2F17, 7.38:1) instead.
  {
    plugins: { ummat: { rules: { 'no-brand-light-on-light': noBrandLightOnLight } } },
    rules: {
      'ummat/no-brand-light-on-light': 'error',
    },
  },
]

export default eslintConfig
