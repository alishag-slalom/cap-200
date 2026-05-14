import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#0A0F1C',
          surface: '#111827',
          primary: '#1A6EFF',
          success: '#1DB87A',
          warning: '#F5A623',
          error: '#E03B3B',
          'on-background': '#E2E8F0',
          'on-surface': '#E2E8F0',
        },
      },
      light: {
        dark: false,
        colors: {
          background: '#F4F6FA',
          surface: '#FFFFFF',
          primary: '#1A6EFF',
          success: '#1DB87A',
          warning: '#F5A623',
          error: '#E03B3B',
          'on-background': '#1E293B',
          'on-surface': '#1E293B',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})
