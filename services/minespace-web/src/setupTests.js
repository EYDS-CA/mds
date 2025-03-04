import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import path from "path";
import server from "@/tests/server";
import "@testing-library/jest-dom";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
});

afterAll(() => {
  server.close();
});

require("jest-localstorage-mock");

Enzyme.configure({ adapter: new Adapter() });

// eslint-disable-next-line @typescript-eslint/no-var-requires
global.REQUEST_HEADER = require(path.resolve(__dirname, "../common/utils/RequestHeaders.js"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
global.GLOBAL_ROUTES = require(path.resolve(__dirname, "./constants/routes.ts"));

global.requestAnimationFrame = (callback) => {
  setTimeout(callback, 0);
};

jest.mock("@mds/common/providers/featureFlags/useFeatureFlag", () => ({
  useFeatureFlag: () => ({
    isFeatureEnabled: () => true,
  }),
}));

const location = JSON.stringify(window.location);
delete window.location;

Object.defineProperty(window, "location", {
  value: JSON.parse(location),
});

Object.defineProperty(global.location, "href", {
  value: "http://localhost",
  configurable: true,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
