(async function () {
  const root = document.querySelector("main"),
    form = document.getElementById("widget"),
    feedback = document.getElementById("feedback"),
    button = form.querySelector("button");
  const endpoint =
    "/api/public/widget/" + encodeURIComponent(root.dataset.slug);
  let config,
    requestKey = crypto.randomUUID(),
    token = "",
    widgetId;
  function message(text) {
    feedback.textContent = text;
    feedback.focus();
  }
  try {
    const response = await fetch(endpoint);
    config = await response.json();
    if (!response.ok) throw Error(config.error);
    const select = form.elements.ruleId;
    config.catalog
      .filter((r) => !r.isExtra && r.active)
      .forEach((r) => {
        const option = document.createElement("option");
        option.value = r.id;
        option.textContent = r.name;
        select.appendChild(option);
      });
    config.catalog
      .filter((r) => r.isExtra && r.active)
      .forEach((r) => {
        const label = document.createElement("label"),
          input = document.createElement("input");
        input.type = "checkbox";
        input.name = "extra";
        input.value = r.id;
        label.append(input, document.createTextNode(r.name));
        document.getElementById("extras").appendChild(label);
      });
    let quoteTimer,
      quoteSequence = 0;
    function estimate() {
      const rule = config.catalog.find((r) => r.id === select.value);
      if (!rule) return;
      document.getElementById("dimensions").hidden = rule.unit !== "M2";
      const item = {
        ruleId: rule.id,
        quantity: Number(form.elements.quantity.value),
        extras: Array.from(form.querySelectorAll('[name="extra"]:checked')).map(
          (e) => e.value,
        ),
        ...(rule.unit === "M2"
          ? {
              width: Number(form.elements.width.value),
              length: Number(form.elements.length.value),
            }
          : {}),
      };
      clearTimeout(quoteTimer);
      const sequence = ++quoteSequence;
      document.getElementById("estimate").textContent = "Ár számítása…";
      quoteTimer = setTimeout(async () => {
        try {
          const response = await fetch(
            "/api/public/quote/" +
              encodeURIComponent(root.dataset.slug) +
              "?item=" +
              encodeURIComponent(JSON.stringify(item)),
          );
          const result = await response.json();
          if (!response.ok) throw Error(result.error);
          if (sequence === quoteSequence)
            document.getElementById("estimate").textContent =
              "Becsült díj: " + result.total.toLocaleString("hu-HU") + " Ft";
        } catch (error) {
          if (sequence === quoteSequence)
            document.getElementById("estimate").textContent =
              error.message || "A becslés nem érhető el.";
        }
      }, 300);
    }
    form.addEventListener("input", (event) => {
      if (
        ["ruleId", "width", "length", "quantity", "extra"].includes(
          event.target.name,
        )
      )
        estimate();
    });
    estimate();
    if (!config.turnstileSiteKey)
      throw Error("Az ajánlatkérés spamvédelme még nincs beállítva.");
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.onload = () => {
      widgetId = window.turnstile.render("#turnstile", {
        sitekey: config.turnstileSiteKey,
        callback: (t) => {
          token = t;
        },
        "expired-callback": () => {
          token = "";
        },
      });
    };
    document.head.appendChild(script);
  } catch (error) {
    message(error.message || "A betöltés nem sikerült.");
    button.disabled = true;
    return;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!token) {
      message("Végezd el a spamellenőrzést.");
      return;
    }
    button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      data.requestKey = requestKey;
      data.turnstileToken = token;
      data.items = [
        {
          ruleId: data.ruleId,
          quantity: Number(data.quantity),
          width: Number(data.width),
          length: Number(data.length),
          extras: Array.from(
            form.querySelectorAll('[name="extra"]:checked'),
          ).map((e) => e.value),
        },
      ];
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      message(
        "Köszönjük! A megkeresést rögzítettük, a szolgáltató hamarosan jelentkezik.",
      );
      button.hidden = true;
      requestKey = crypto.randomUUID();
    } catch (error) {
      message(error.message || "Nem sikerült elküldeni. Próbáld újra.");
      if (window.turnstile) {
        window.turnstile.reset(widgetId);
        token = "";
      }
    } finally {
      button.disabled = false;
    }
  });
})();
