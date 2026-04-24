package mocks

// MockClient implements example.Client for testing.
type MockClient struct {
	CallCount int
	ReturnErr error
}
