import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ImageUrlField } from "../src/components/ui/ImageUrlField";
import { MediaUploadButton } from "../src/components/ui/MediaUploadButton";
import { fetchWrapper } from "../src/providers/dataProvider";
vi.mock("../src/providers/dataProvider", () => ({ fetchWrapper: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Direct media upload UX", () => {
  it("updates the photo only after upload succeeds and exposes its preview", async () => {
    const change = vi.fn();
    let resolve!: (value: Response) => void;
    vi.mocked(fetchWrapper).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const view = render(
      <ImageUrlField value="/masjid-umar.jpg" onChange={change} />,
    );
    fireEvent.change(screen.getByLabelText("Unggah foto dari perangkat"), {
      target: {
        files: [new File(["photo"], "foto.png", { type: "image/png" })],
      },
    });
    expect(screen.getByRole("status").textContent).toContain("Mengunggah");
    expect(change).not.toHaveBeenCalled();
    resolve(
      Response.json({
        data: { url: "https://storage.example.test/photo.webp" },
      }),
    );
    await waitFor(() =>
      expect(change).toHaveBeenCalledWith(
        "https://storage.example.test/photo.webp",
      ),
    );
    view.rerender(
      <ImageUrlField
        value="https://storage.example.test/photo.webp"
        onChange={change}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Pratinjau foto" }).getAttribute("src"),
    ).toBe("https://storage.example.test/photo.webp");
    fireEvent.click(screen.getByRole("button", { name: /Hapus foto/ }));
    expect(change).toHaveBeenLastCalledWith("");
  });
  it("retains the old image and presents a useful error when storage is unavailable", async () => {
    vi.mocked(fetchWrapper).mockRejectedValueOnce({
      message: "Penyimpanan belum dikonfigurasi",
      statusCode: 503,
    });
    const change = vi.fn();
    render(<ImageUrlField value="/masjid-umar.jpg" onChange={change} />);
    fireEvent.change(screen.getByLabelText("Unggah foto dari perangkat"), {
      target: {
        files: [new File(["photo"], "foto.jpg", { type: "image/jpeg" })],
      },
    });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "belum dikonfigurasi",
    );
    expect(change).not.toHaveBeenCalled();
  });
  it("blocks unsupported files before making a network request", () => {
    render(<MediaUploadButton onUploaded={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Unggah foto dari perangkat"), {
      target: {
        files: [new File(["<svg/>"], "foto.svg", { type: "image/svg+xml" })],
      },
    });
    expect(screen.getByRole("alert").textContent).toContain("JPG");
    expect(fetchWrapper).not.toHaveBeenCalled();
  });
  it("requires the public PDF warning to be acknowledged", () => {
    render(<MediaUploadButton kind="document" onUploaded={vi.fn()} />);
    const input = screen.getByLabelText(
      "Unggah PDF publik dari perangkat",
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(input.disabled).toBe(false);
  });
});
