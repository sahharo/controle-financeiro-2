// Armazenamento local falso para os testes (o real é nativo).
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock exige require
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
