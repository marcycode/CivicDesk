import { describe, expect, it } from "vitest";
import { asCategory, asPriority, asStatus, toWorkOrderFilters } from "@/lib/validators";

describe("asStatus / asPriority / asCategory", () => {
  it("accepts canonical enum values", () => {
    expect(asStatus("Open")).toBe("Open");
    expect(asStatus("In Progress")).toBe("In Progress");
    expect(asPriority("Urgent")).toBe("Urgent");
    expect(asCategory("HVAC")).toBe("HVAC");
  });

  it("returns undefined for unknown values", () => {
    expect(asStatus("Maybe")).toBeUndefined();
    expect(asPriority("urgent")).toBeUndefined();
    expect(asCategory("Cybersecurity")).toBeUndefined();
  });

  it("returns undefined for empty / missing input", () => {
    expect(asStatus(undefined)).toBeUndefined();
    expect(asStatus("")).toBeUndefined();
  });
});

describe("toWorkOrderFilters", () => {
  it("coerces known fields and drops unknown enums", () => {
    expect(
      toWorkOrderFilters({
        status: "Open",
        priority: "garbage",
        facilityId: "fac-1",
        category: "HVAC",
        assigneeId: "tech-2"
      })
    ).toEqual({
      status: "Open",
      priority: undefined,
      facilityId: "fac-1",
      category: "HVAC",
      assigneeId: "tech-2"
    });
  });

  it("treats empty strings as undefined for free-text fields", () => {
    expect(toWorkOrderFilters({ facilityId: "", assigneeId: "" })).toEqual({
      status: undefined,
      priority: undefined,
      facilityId: undefined,
      category: undefined,
      assigneeId: undefined
    });
  });
});
