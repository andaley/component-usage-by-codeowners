import { Button } from '@acme/design-system';

export function Button({ children, ...props }) {
  return (
    <Button {...props}>
      {children}
    </Button>
  );
}
