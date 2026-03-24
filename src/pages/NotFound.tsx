import { useSeoMeta } from '@unhead/react';

const NotFound = () => {
  useSeoMeta({
    title: '404 - Page Not Found',
    description: 'The page you are looking for could not be found. Return to the home page to continue browsing.',
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="text-center">
        <p className="font-mono text-xs text-muted-foreground">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">page not found</h1>
        <a href="/" className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4">
          return home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
