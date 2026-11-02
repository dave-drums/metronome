import { mountMetronome } from "../embed";
import { nextTick } from "vue";

function host() {
  const element = document.createElement("div");
  element.id = "metronome-app";
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute("color-scheme");
  localStorage.clear();
});

it("mounts in a shadow root, isolates theme, and supports unmount/remount", async () => {
  const element = host();
  document.documentElement.setAttribute("color-scheme", "host-theme");
  const promise = mountMetronome(element);
  const shadow = element.shadowRoot!;
  shadow.querySelector("link")!.dispatchEvent(new Event("load"));
  const instance = await promise;
  expect(shadow.querySelector("h1")!.textContent).toBe("Metronome");
  expect(element.querySelector("h1")).toBeNull();
  const radio = shadow.querySelector<HTMLInputElement>(
    'input[name="desktop-theme"][value="dark"]'
  )!;
  radio.click();
  await nextTick();
  expect(
    shadow.querySelector(".metronome-frame")!.getAttribute("color-scheme")
  ).toBe("dark");
  expect(document.documentElement.getAttribute("color-scheme")).toBe(
    "host-theme"
  );
  expect(localStorage.getItem("dave-drums-metronome")).toContain(
    '"theme":"dark"'
  );
  await expect(mountMetronome(element)).rejects.toThrow("already mounted");
  instance.unmount();
  expect(shadow.childNodes.length).toBe(0);
  const again = mountMetronome(element);
  shadow.querySelector("link")!.dispatchEvent(new Event("load"));
  (await again).unmount();
});

it("reports missing containers and failed CSS loading, and permits retry", async () => {
  await expect(mountMetronome("#missing")).rejects.toThrow("not found");
  const element = host();
  const promise = mountMetronome(element);
  element.shadowRoot!.querySelector("link")!.dispatchEvent(new Event("error"));
  await expect(promise).rejects.toThrow("Unable to load metronome CSS");
  const retry = mountMetronome(element);
  element.shadowRoot!.querySelector("link")!.dispatchEvent(new Event("load"));
  (await retry).unmount();
});
