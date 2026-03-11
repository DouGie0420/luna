'use client';

import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-headline">Privacy Policy</CardTitle>
            <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none text-muted-foreground space-y-4">
            <p>
              Welcome to LUNA. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </p>
            <h2 className="text-foreground">1. Information We Collect</h2>
            <p>
              We may collect personal information that you provide to us directly, such as your name, email address, and profile picture when you register for an account. We also collect information automatically when you use our service, such as your IP address, device information, and usage data. For transactions, we may collect payment and shipping information.
            </p>
            <h2 className="text-foreground">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul>
              <li>Provide, operate, and maintain our services.</li>
              <li>Improve, personalize, and expand our services.</li>
              <li>Understand and analyze how you use our services.</li>
              <li>Process your transactions and manage your orders.</li>
              <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the app, and for marketing and promotional purposes.</li>
              <li>Prevent fraud and ensure the security of our platform.</li>
            </ul>
            <h2 className="text-foreground">3. Sharing Your Information</h2>
            <p>
              We do not sell your personal information. We may share information with third-party vendors and service providers that perform services for us, such as payment processing and data analytics. We may also share information if required by law or to protect our rights.
            </p>
            <h2 className="text-foreground">4. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at support@luna.gift.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
