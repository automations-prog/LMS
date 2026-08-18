import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import CourseController from '@/actions/App/Http/Controllers/CourseController';
import FileInput from '@/components/file-input';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { index } from '@/routes/courses';

type Category = {
    id: number;
    name: string;
};

type Props = {
    categories: Category[];
    returnTo: string;
};

export default function CoursesCreate({ categories, returnTo }: Props) {
    const [resourceType, setResourceType] = useState<'pdf' | 'link'>('link');
    const [categoryId, setCategoryId] = useState(
        categories[0] ? String(categories[0].id) : '',
    );

    return (
        <>
            <Head title="Add resource" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
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
                        title="Add resource"
                        description="Fill out the details below to create a new resource"
                    />
                </div>

                <Form
                    {...CourseController.store.form()}
                    className="grid gap-6 xl:grid-cols-3"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-6 xl:col-span-2">
                                <div className="space-y-6 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                            id="title"
                                            name="title"
                                            required
                                            autoFocus
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
                                            rows={6}
                                        />
                                        <InputError
                                            message={errors.description}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
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
                                            />
                                            <InputError
                                                message={errors.resource_url}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-6 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                                    <div className="grid gap-2">
                                        <Label htmlFor="category_id">
                                            Category
                                        </Label>
                                        <Combobox
                                            id="category_id"
                                            value={categoryId}
                                            onChange={setCategoryId}
                                            placeholder="Select a category"
                                            searchPlaceholder="Search categories…"
                                            emptyText="No categories found."
                                            options={categories.map(
                                                (category) => ({
                                                    value: String(
                                                        category.id,
                                                    ),
                                                    label: category.name,
                                                }),
                                            )}
                                        />
                                        <input
                                            type="hidden"
                                            name="category_id"
                                            value={categoryId}
                                        />
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
                                        />
                                        <InputError
                                            message={errors.due_days}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="thumbnail">
                                            Thumbnail (optional)
                                        </Label>
                                        <FileInput
                                            id="thumbnail"
                                            name="thumbnail"
                                            accept="image/*"
                                        />
                                        <InputError
                                            message={errors.thumbnail}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                                    <Button
                                        type="submit"
                                        name="status"
                                        value="published"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Publish
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
                                    <Button variant="outline" asChild>
                                        <Link href={returnTo}>Cancel</Link>
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

CoursesCreate.layout = {
    breadcrumbs: [
        {
            title: 'Resources',
            href: index(),
        },
        {
            title: 'Add resource',
            href: '#',
        },
    ],
};
