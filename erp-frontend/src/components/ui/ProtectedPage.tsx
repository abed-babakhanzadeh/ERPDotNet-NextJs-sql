
import React from 'react';

// این یک کامپوننت placeholder است
const ProtectedPage = ({ children, permission }: { children: React.ReactNode, permission: string }) => {
    console.log(`Checking permission: ${permission}`);
    return <>{children}</>;
};

export default ProtectedPage;
