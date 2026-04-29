# Embeddable Widget

ChatIslam can be embedded in other websites as a chat widget. Islamic organizations, masjids, and other Islamic sites can add a ChatIslam panel to their pages without building their own AI infrastructure.

## Quick embed (iframe)

The simplest integration is an iframe:

```html
<iframe
  src="https://chatislam.org/widget?mode=muslim&lang=en"
  width="400"
  height="600"
  style="border: none; border-radius: 12px;"
  title="ChatIslam"
></iframe>
```

The widget URL accepts these query parameters:

| Parameter | Values | Default | Description |
| --- | --- | --- | --- |
| `mode` | `muslim`, `newmuslim`, `dawah` | `muslim` | Starting audience mode |
| `lang` | `en`, `ar`, `id` | `en` | Display language |
| `theme` | `light`, `dark`, `auto` | `auto` | Color theme |
| `compact` | `true`, `false` | `false` | Compact UI for narrow embeds |

## JavaScript widget

For more control, use the JavaScript widget which adds a floating chat button:

```html
<script
  src="https://chatislam.org/widget.js"
  data-mode="muslim"
  data-lang="en"
  data-theme="auto"
  async
></script>
```

The widget script injects a floating button into the page. Clicking it opens a chat panel without navigating away.

## Integration with Ummat App

ChatIslam is embedded in the Ummat App as a full-page chat experience using the same iframe widget. The Ummat App passes the user's session token via `postMessage` to enable authenticated chat within the widget.

```javascript
// Ummat App sends auth token to embedded widget
widgetIframe.contentWindow.postMessage(
  { type: 'auth', token: userJwt },
  'https://chatislam.org'
)
```

The widget listens for this message and uses the provided JWT for authenticated requests.

## Attribution

Embedded widgets show a "Powered by ChatIslam" link in the footer. This is required for free use. The link opens chatislam.org in a new tab.

## Partner API

Organizations who want deeper integration (custom branding, no attribution link, custom rate limits) can contact us at chatislam.org for a partner arrangement.

## See Also

- [[AI-Architecture]] -- how the AI pipeline works
- [[Rate-Limiting]] -- limits that apply to embedded widget usage
- [[Audience-Modes]] -- mode descriptions for embedding decisions
