import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import CourseController from '@/actions/App/Http/Controllers/CourseController';
import FileInput from '@/components/file-input';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { index } from '@/routes/courses';

type Category = {
    id: number;
    name: string;
};

type CourseDetail = {
    id: number;
    title: string;
    description: string;
    category_id: number;
    thumbnail_path: string | null;
    resource_type: 'pdf' | 'link';
    resource_path: string | null;
    resource_url: string | null;
    due_days: number | null;
    status: 'draft' | 'published';
};

type Props = {
    course: CourseDetail;
    categories: Category[];
    returnTo: string;
};

function fileName(path: string | null) {
    return path ? path.split('/').pop() : null;
}

export default function CoursesEdit({ course, categories, returnTo }: Props) {
    const [resourceType, setResourceType] = useState<'pdf' | 'link'>(
        course.resource_type,
    );

    return (
        <>
            <Head title={`Edit ${course.title}`} />

            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
                <div>
                    <Link
                        href={returnTo}
                        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Back to resources
                    </Link>

                    <Heading
                        variant="small"
                        title="Edit resource"
                        description="Update this resource's details"
                    />
                </div>

                <div className="rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                    <Form
                        {...CourseController.update.form(course.id)}
                        className="space-y-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        name="title"
                                        required
                                        autoFocus
                                        defaultValue={course.title}
                                    />
                                    <InputError message={errors.title} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        required
                                        rows={4}
                                        defaultValue={course.description}
                                    />
                                    <InputError
                                        message={errors.description}
                                    />
                                </div>

                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="category_id">
                                            Category
                                        </Label>
                                        <Select
                                            name="category_id"
                                            defaultValue={String(
                                                course.category_id,
                                            )}
                                        >
                                            <SelectTrigger
                                                id="category_id"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map(
                                                    (category) => (
                                                        <SelectItem
                                                            key={category.id}
                                                            value={String(
                                                                category.id,
                                                            )}
                                                        >
                                                            {category.name}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.category_id}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="due_days">
                                            Due days (optional)
                                        </Label>
                                        <Input
                                            id="due_days"
                                            type="number"
                                            name="due_days"
                                            min={1}
                                            placeholder="e.g. 30"
                                            defaultValue={
                                                course.due_days ?? ''
                                            }
                                        />
                                        <InputError
                                            message={errors.due_days}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="thumbnail">
                                        Thumbnail (optional)
                                    </Label>
                                    <FileInput
                                        id="thumbnail"
                                        name="thumbnail"
                                        accept="image/*"
                                        currentFileLabel={
                                            fileName(course.thumbnail_path)
                                                ? `Current: ${fileName(course.thumbnail_path)}`
                                                : undefined
                                        }
                                    />
                                    <InputError message={errors.thumbnail} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Resource</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={
                                                resourceType === 'pdf'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            onClick={() =>
                                                setResourceType('pdf')
                                            }
                                        >
                                            Upload PDF
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                resourceType === 'link'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            onClick={() =>
                                                setResourceType('link')
                                            }
                                        >
                                            External link
                                        </Button>
                                    </div>
                                    <input
                                        type="hidden"
                                        name="resource_type"
                                        value={resourceType}
                                    />
                                    <input
                                        type="hidden"
                                        name="return_to"
                                        value={returnTo}
                                    />

                                    {resourceType === 'pdf' ? (
                                        <>
                                            <FileInput
                                                id="resource_file"
                                                name="resource_file"
                                                accept="application/pdf"
                                                currentFileLabel={
                                                    fileName(
                                                        course.resource_path,
                                                    )
                                                        ? `Current: ${fileName(course.resource_path)} (leave blank to keep)`
                                                        : undefined
                                                }
                                            />
                                            <InputError
                                                message={errors.resource_file}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <Input
                                                type="url"
                                                name="resource_url"
                                                placeholder="https://example.com/resource"
                                                defaultValue={
                                                    course.resource_url ?? ''
                                                }
                                            />
                                            <InputError
                                                message={errors.resource_url}
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-3 border-t border-sidebar-border/70 pt-6 dark:border-sidebar-border">
                                    <Button variant="outline" asChild>
                                        <Link href={returnTo}>Cancel</Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        name="status"
                                        value="draft"
                                        variant="secondary"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Save as draft
                                    </Button>
                                    <Button
                                        type="submit"
                                        name="status"
                                        value="published"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Publish
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}

CoursesEdit.layout = {
    breadcrumbs: [
        {
            title: 'Resources',
            href: index(),
        },
        {
            title: 'Edit resource',
            href: '#',
        },
    ],
};
