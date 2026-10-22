import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "../src/pages/public/HomePage";
import { ProgramsPage } from "../src/pages/public/ProgramsPage";
import { VenuesPage } from "../src/pages/public/VenuesPage";
import { VenueDetailPage } from "../src/pages/public/VenueDetailPage";
import { AdminAnnouncementsPage } from "../src/pages/admin/AdminAnnouncementsPage";
import { AdminVenuesPage } from "../src/pages/admin/AdminVenuesPage";
import { AdminAnnouncementForm } from "../src/pages/admin/AdminAnnouncementForm";

const state = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  venue: {
    id: "venue-1",
    slug: "al-ukhuwwah",
    name: "Masjid Agung Al Ukhuwwah",
    address: "Jl. Majelis",
    city: "Bandung",
    status: "active",
    image: "",
  },
}));
vi.mock("@refinedev/core", () => ({
  useList: ({ resource }: { resource: string }) => ({
    result: {
      data:
        resource === "venues"
          ? [state.venue]
          : resource === "programs"
            ? [
                {
                  id: "program-1",
                  title: "Program tanpa sampul",
                  status: "published",
                  description: "Deskripsi",
                },
              ]
            : resource === "announcements"
              ? [
                  {
                    id: "notice-1",
                    title: "Pengumuman gambar",
                    status: "published",
                    createdAt: "2026-10-22",
                    imageUrl: "https://cdn.example.test/unavailable.jpg",
                  },
                ]
              : [],
    },
    query: {
      isFetched: true,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    },
  }),
  useOne: ({ resource }: { resource: string }) => ({
    result: resource === "venues" ? state.venue : undefined,
    query: { isLoading: false, isError: false, refetch: vi.fn() },
  }),
  useCreate: () => ({ mutate: state.create, mutation: { isPending: false } }),
  useUpdate: () => ({ mutate: state.update, mutation: { isPending: false } }),
  useDelete: () => ({ mutate: vi.fn(), mutation: { isPending: false } }),
}));
vi.mock("../src/components/public/KnowledgeJourney", () => ({
  KnowledgeJourney: () => null,
}));
afterEach(cleanup);
beforeEach(() => {
  state.create.mockReset();
  state.update.mockReset();
  state.venue.image = "";
});

describe("Image coverage across public, participant and admin pages", () => {
  it.each([HomePage, ProgramsPage])(
    "uses a clear program placeholder without requesting absent covers in %s",
    (Page) => {
      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole("img", {
          name: /Program tanpa sampul — Gambar belum tersedia/,
        }),
      ).toBeDefined();
      for (const img of document.querySelectorAll("img"))
        expect(img.getAttribute("src")).not.toMatch(
          /masjid-al-ukhuwah|masjid-umar-bin-khattab/,
        );
    },
  );
  it.each([HomePage, VenuesPage, VenueDetailPage])(
    "uses the matching local image for a location without a photo in %s",
    (Page) => {
      render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole("img", { name: state.venue.name }).getAttribute("src"),
      ).toBe("/masjid-ukhuwah.jpg");
    },
  );
  it.each([VenuesPage, VenueDetailPage])(
    "honors remote location photos in the participant/public shared page %s",
    (Page) => {
      state.venue.image = "https://cdn.example.test/custom-masjid.jpg";
      render(
        <MemoryRouter initialEntries={["/belajar/lokasi/venue-1"]}>
          <Page />
        </MemoryRouter>,
      );
      const image = screen.getByRole("img", { name: state.venue.name });
      expect(image.getAttribute("src")).toBe(state.venue.image);
      fireEvent.error(image);
      expect(
        screen.getByRole("img", { name: state.venue.name }).getAttribute("src"),
      ).toBe("/masjid-ukhuwah.jpg");
    },
  );
  it("does not leave a broken image in admin announcements", () => {
    render(
      <MemoryRouter>
        <AdminAnnouncementsPage />
      </MemoryRouter>,
    );
    fireEvent.error(screen.getByRole("img", { name: "Pengumuman gambar" }));
    expect(screen.getByText("Gambar tidak dapat dimuat")).toBeDefined();
  });
  it.each([0, 1])(
    "exposes the location image editor from desktop/mobile action %s and saves the URL",
    (action) => {
      render(
        <MemoryRouter>
          <AdminVenuesPage />
        </MemoryRouter>,
      );
      fireEvent.click(
        screen.getAllByRole("button", { name: /^Edit$/ })[action],
      );
      const input = screen.getByLabelText("URL foto lokasi (opsional)");
      fireEvent.change(input, { target: { value: "/masjid-umar.jpg" } });
      expect(
        screen.getByRole("img", { name: "Pratinjau foto" }).getAttribute("src"),
      ).toBe("/masjid-umar.jpg");
      fireEvent.click(screen.getByRole("button", { name: "Simpan Perubahan" }));
      expect(state.update).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.objectContaining({ image: "/masjid-umar.jpg" }),
        }),
        expect.anything(),
      );
    },
  );
  it("exposes the same image preview in the announcement editor", () => {
    render(<AdminAnnouncementForm />);
    fireEvent.change(screen.getByLabelText("URL foto (opsional)"), {
      target: { value: "https://cdn.example.test/announcement.jpg" },
    });
    expect(
      screen.getByRole("img", { name: "Pratinjau foto" }).getAttribute("src"),
    ).toBe("https://cdn.example.test/announcement.jpg");
  });
});
