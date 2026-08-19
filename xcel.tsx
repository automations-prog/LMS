import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    DollarSign,
    BookOpen,
    Percent,
    RotateCcw,
    RefreshCw,
    Copy,
    Upload,
    FileCheck2,
} from 'lucide-react';

export default function AhipCertificationCard({ onSubmitCertificate }) {
    const [file, setFile] = useState(null);

    function copyEnrollUrl() {
        navigator.clipboard.writeText('https://www.ahipmedicaretraining.com/clients/oim');
    }

    function handleFileChange(e) {
        setFile(e.target.files?.[0] ?? null);
    }

    function handleSubmit() {
        if (file) onSubmitCertificate?.(file);
    }

    return (
        <Card>
            <CardHeader className="space-y-1">
                <h3 className="text-base font-medium">AHIP/FWA certification</h3>
                <p className="text-sm text-muted-foreground">
                    Immediately after your license is active, complete AHIP
                    certification (Medicare + Fraud, Waste, and Abuse training) —
                    required before you can sell Medicare Advantage or Part D plans.
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 w-fit">
                    <code className="text-xs text-primary">
                        ahipmedicaretraining.com/clients/oim
                    </code>
                    <button
                        onClick={copyEnrollUrl}
                        aria-label="Copy enrollment URL"
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <InfoBlock
                        icon={<DollarSign className="h-4 w-4" />}
                        label="Cost"
                        value="$125 via this link"
                        note="Discounted from $175"
                    />
                    <InfoBlock
                        icon={<BookOpen className="h-4 w-4" />}
                        label="Format"
                        value="Online, self-paced"
                        note="Roughly 6–8 hours of study"
                    />
                    <InfoBlock
                        icon={<Percent className="h-4 w-4" />}
                        label="Passing score"
                        value="90% (45/50)"
                        note=""
                    />
                    <InfoBlock
                        icon={<RotateCcw className="h-4 w-4" />}
                        label="Attempts"
                        value="Capped at 3"
                        note="Don't rush the exam"
                    />
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                        <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                            Renews annually — this is required again every
                            certification cycle, not one-and-done.
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="space-y-2">
                    <p className="text-sm font-medium">Upload your AHIP completion certificate</p>

                    <label
                        htmlFor="ahip-upload"
                        className="flex items-center gap-3 rounded-md border border-dashed px-4 py-3 cursor-pointer hover:border-primary transition-colors"
                    >
                        {file ? (
                            <FileCheck2 className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                            <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm text-muted-foreground truncate">
                            {file ? file.name : 'Choose a file…'}
                        </span>
                        <input
                            id="ahip-upload"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>

                    <Button onClick={handleSubmit} disabled={!file} className="w-full">
                        Submit certificate
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function InfoBlock({ icon, label, value, note }) {
    return (
        <div className="rounded-md border px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                {icon}
                <span className="text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-medium">{value}</p>
            {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
        </div>
    );
}