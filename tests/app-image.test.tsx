import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppImage } from "../src/components/ui/AppImage";
import { ImageUrlField } from "../src/components/ui/ImageUrlField";

afterEach(cleanup);
describe("Resilient application images", () => {
  it("loads the normalized source, lazily by default, and exposes load completion", () => {
    render(<AppImage src="/masjid-al-ukhuwah.jpg" alt="Lokasi" />);
    const image = screen.getByRole("img", { name: "Lokasi" });
    expect(image.getAttribute("src")).toBe("/masjid-ukhuwah.jpg");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("decoding")).toBe("async");
    expect(image.getAttribute("data-image-state")).toBe("loading");
    fireEvent.load(image);
    expect(image.getAttribute("data-image-state")).toBe("loaded");
  });
  it("tries the local fallback only once then removes the broken img, keeping space and alternative text", () => {
    render(
      <AppImage
        src="https://cdn.example.test/expired.jpg"
        fallbackSrc="/masjid-umar.jpg"
        kind="venue"
        alt="Majelis"
        className="h-48 w-full"
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Majelis" }));
    expect(
      screen.getByRole("img", { name: "Majelis" }).getAttribute("src"),
    ).toBe("/masjid-umar.jpg");
    fireEvent.error(screen.getByRole("img", { name: "Majelis" }));
    const placeholder = screen.getByRole("img", {
      name: /Majelis — Gambar tidak dapat dimuat/,
    });
    expect(placeholder.tagName).toBe("SPAN");
    expect(placeholder.className).toContain("h-48");
    expect(document.querySelector("img")).toBeNull();
  });
  it("does not loop when primary and fallback are the same asset", () => {
    render(
      <AppImage
        src="/masjid-al-ukhuwah.jpg"
        fallbackSrc="/masjid-ukhuwah.jpg"
        alt="Lokasi"
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Lokasi" }));
    expect(document.querySelector("img")).toBeNull();
  });
  it.each([null, "", "javascript:alert(1)"])(
    "renders an honest placeholder for missing or unsafe source %s",
    (source) => {
      render(<AppImage src={source} alt="Program" kind="program" />);
      expect(document.querySelector("img")).toBeNull();
      expect(screen.getByText("Gambar belum tersedia")).toBeDefined();
    },
  );
  it("starts fresh when the admin changes a failed source and when the account changes", () => {
    const view = render(
      <AppImage
        src="https://example.test/expired.jpg"
        alt="Profil"
        kind="avatar"
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Profil" }));
    view.rerender(
      <AppImage
        src="https://example.test/new.jpg"
        alt="Profil"
        kind="avatar"
      />,
    );
    expect(
      screen.getByRole("img", { name: "Profil" }).getAttribute("src"),
    ).toBe("https://example.test/new.jpg");
    view.rerender(<AppImage src={null} alt="Profil" kind="avatar" />);
    expect(document.querySelector("img")).toBeNull();
  });
  it("preserves eager brand loading, dimensions and decorative semantics", () => {
    const view = render(
      <AppImage
        src="/logo-abu-haidar.jpg"
        alt=""
        loading="eager"
        width={44}
        height={44}
        kind="brand"
      />,
    );
    const img = view.container.querySelector("img")!;
    expect(img.getAttribute("loading")).toBe("eager");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).toBeNull();
    expect(
      view.container
        .querySelector('[data-image-state="unavailable"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
  });
  it("shows a direct URL preview and validates the input with accessible feedback", () => {
    const change = vi.fn();
    const view = render(<ImageUrlField value="" onChange={change} />);
    const input = screen.getByLabelText(
      "URL foto (opsional)",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "javascript:bad" } });
    expect(change).toHaveBeenCalledWith("javascript:bad");
    expect(input.validity.customError).toBe(true);
    view.rerender(<ImageUrlField value="javascript:bad" onChange={change} />);
    expect(screen.getByRole("alert").textContent).toContain(
      "URL gambar tidak valid",
    );
    fireEvent.change(input, { target: { value: "/masjid-umar.jpg" } });
    view.rerender(<ImageUrlField value="/masjid-umar.jpg" onChange={change} />);
    expect(input.validity.customError).toBe(false);
    const image = screen.getByRole("img", { name: "Pratinjau foto" });
    expect(image.getAttribute("src")).toBe("/masjid-umar.jpg");
    fireEvent.error(image);
    expect(screen.getByText("Gambar tidak dapat dimuat")).toBeDefined();
  });
});
