"use client";

import { ReactNode } from "react";

const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
    return (
        <div className={`bg-white border border-border rounded-2xl shadow-sm ${className}`}>
            {children}
        </div>
    );
};

const CardHeader = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
    return <div className={`p-6 ${className}`}>{children}</div>;
};

const CardTitle = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
    return <h3 className={`text-xl font-bold font-outfit text-foreground ${className}`}>{children}</h3>;
};

const CardDescription = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
    return <p className={`text-sm text-muted-foreground mt-1 ${className}`}>{children}</p>;
};

const CardContent = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
    return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
};

const CardFooter = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
    return <div className={`p-6 pt-0 border-t border-border ${className}`}>{children}</div>;
};

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
