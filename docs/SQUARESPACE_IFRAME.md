# Squarespace Iframe Embed

Use this in a Squarespace Code Block and replace `PACBECCA_URL_HERE` with the hosted `dist-squarespace/index.html` URL.

```html
<div class="pacbecca-embed">
  <iframe
    id="pacbecca-frame"
    src="PACBECCA_URL_HERE"
    title="PacBecca"
    allowfullscreen
  ></iframe>
</div>

<style>
  .pacbecca-embed {
    width: 100%;
    height: min(100dvh, calc(100vw * 0.6667));
    min-height: 360px;
    overflow: hidden;
  }

  .pacbecca-embed iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    overflow: hidden;
  }

  @media (max-width: 720px) {
    .pacbecca-embed {
      height: min(100dvh, calc(100vw * 1.15));
    }
  }
</style>

<script>
  (() => {
    const frame = document.getElementById("pacbecca-frame");
    const embed = frame?.closest(".pacbecca-embed");

    const resize = () => {
      if (!frame || !embed) {
        return;
      }

      const width = embed.getBoundingClientRect().width;
      const height = Math.min(window.innerHeight, Math.max(360, width * 0.6667));
      embed.style.height = `${height}px`;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("message", (event) => {
      if (event.data?.type === "pacbecca:resize") {
        resize();
      }
    });
    resize();
  })();
</script>
```
