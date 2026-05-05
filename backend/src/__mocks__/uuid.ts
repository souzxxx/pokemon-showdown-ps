let counter = 0;

export const v4 = jest.fn(() => `test-uuid-${++counter}`);

beforeEach(() => {
  counter = 0;
  v4.mockClear();
  v4.mockImplementation(() => `test-uuid-${++counter}`);
});
