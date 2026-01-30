import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export default function KYCPage() {
    const kycStatus = "Verified"; // Can be 'Not Verified', 'Pending', 'Verified'

    return (
        <div>
            <h1 className="text-3xl font-headline mb-6">KYC Verification</h1>

            <Card className="mb-8">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="h-8 w-8 text-green-500" />
                        <div>
                            <CardTitle>Current Status</CardTitle>
                             <Badge className={
                                kycStatus === "Verified" ? "bg-green-500 hover:bg-green-600" :
                                kycStatus === "Pending" ? "bg-yellow-500 hover:bg-yellow-600" :
                                "bg-red-500 hover:bg-red-600"
                            }>{kycStatus}</Badge>
                        </div>
                    </div>
                </CardHeader>
                 {kycStatus !== 'Verified' && (
                    <CardContent>
                        <p className="text-muted-foreground">
                            {kycStatus === 'Pending' 
                                ? 'Your documents are under review. This usually takes 1-2 business days.'
                                : 'Please complete verification to access all features.'
                            }
                        </p>
                    </CardContent>
                 )}
            </Card>

            {kycStatus === 'Not Verified' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Submit Your Documents</CardTitle>
                        <CardDescription>
                            Please upload a government-issued ID and a selfie for verification.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="id-upload">Government-Issued ID</Label>
                            <input id="id-upload" type="file" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"/>
                            <p className="text-xs text-muted-foreground">e.g., Passport, Driver's License</p>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="selfie-upload">Selfie with ID</Label>
                            <input id="selfie-upload" type="file" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"/>
                             <p className="text-xs text-muted-foreground">Hold your ID next to your face.</p>
                        </div>
                         <div className="flex justify-end">
                            <Button>Submit for Verification</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
