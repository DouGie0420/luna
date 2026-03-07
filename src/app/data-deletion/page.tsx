'use client';

import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DataDeletionPage() {
  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-headline">Data Deletion Policy</CardTitle>
            <CardDescription>Instructions on how to request the deletion of your data.</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none text-muted-foreground space-y-4">
            <p>
              You have the right to request the deletion of your personal data that we have collected. To initiate a data deletion request, please follow the steps below.
            </p>
            <h2 className="text-foreground">How to Request Data Deletion</h2>
            <p>
              To request the deletion of your account and associated data, please send an email to our support team with the following information:
            </p>
            <ul>
              <li><strong>To:</strong> <a href="mailto:support@luna.io" className="text-primary hover:underline">support@luna.io</a></li>
              <li><strong>Subject:</strong> Data Deletion Request</li>
              <li>
                <strong>Body:</strong> Please include the following details in your email:
                <ul>
                  <li>Your full name and username.</li>
                  <li>The email address associated with your LUNA account.</li>
                  <li>A statement confirming that you wish to permanently delete your account and all associated data.</li>
                </ul>
              </li>
            </ul>
            <h2 className="text-foreground">What Happens Next</h2>
            <p>
              Once we receive your request, our team will verify your identity to protect your account. We may contact you to confirm the request. The deletion process will begin within 30 days of verification. Please note that some data may be retained for legal or security purposes, as permitted by law.
            </p>
             <Button asChild className="mt-4">
                <a href="mailto:support@luna.io?subject=Data Deletion Request">
                    Email Support Now
                </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
