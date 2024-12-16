import { Button } from '@acme/design-system';

export function CustomButton({ children, ...props }) {
  return (
    <Button {...props}>
      {children}
    </Button>
  );
}
