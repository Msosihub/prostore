beforeEach(() => {
  global.fetch = jest.fn(() => {
    throw new Error(
      "Unexpected network request: tests must use mocked services",
    );
  });
});
