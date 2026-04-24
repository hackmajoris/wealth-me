package example

// Client is the main type for this package.
type Client struct{}

// Option is a functional option for Client.
type Option func(*Client)

// New creates a new Client.
func New(opts ...Option) (*Client, error) {
	c := &Client{}
	for _, opt := range opts {
		opt(c)
	}
	return c, nil
}
