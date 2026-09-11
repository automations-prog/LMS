import { Head, router } from '@inertiajs/react';
import FeatureAccessController from '@/actions/App/Http/Controllers/FeatureAccessController';
import Heading from '@/components/heading';
import { Checkbox } from '@/components/ui/checkbox';
import { index } from '@/routes/features';

type FeatureToggle = {
    agent_type: string;
    agent_type_label: string;
    feature: string;
    feature_label: string;
    enabled: boolean;
};

type Props = {
    toggles: FeatureToggle[];
};

export default function FeaturesIndex({ toggles }: Props) {
    const features = [
        ...new Map(
            toggles.map((toggle) => [toggle.feature, toggle.feature_label]),
        ),
    ];
    const agentTypes = [
        ...new Map(
            toggles.map((toggle) => [
                toggle.agent_type,
                toggle.agent_type_label,
            ]),
        ),
    ];

    function isEnabled(agentType: string, feature: string) {
        return (
            toggles.find(
                (toggle) =>
                    toggle.agent_type === agentType &&
                    toggle.feature === feature,
            )?.enabled ?? true
        );
    }

    function toggle(agentType: string, feature: string, enabled: boolean) {
        router.put(
            FeatureAccessController.update.url(),
            { agent_type: agentType, feature, enabled },
            { preserveScroll: true },
        );
    }

    return (
        <>
            <Head title="Feature Access" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Feature Access"
                    description="Turn features on or off per agent segment — a change here applies to every agent in that segment at once."
                />

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="px-4 py-3 font-medium">
                                    Feature
                                </th>
                                {agentTypes.map(([agentType, label]) => (
                                    <th
                                        key={agentType}
                                        className="px-4 py-3 text-center font-medium"
                                    >
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {features.map(([feature, featureLabel]) => (
                                <tr
                                    key={feature}
                                    className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                >
                                    <td className="px-4 py-3 font-medium">
                                        {featureLabel}
                                    </td>
                                    {agentTypes.map(([agentType]) => (
                                        <td
                                            key={agentType}
                                            className="px-4 py-3 text-center"
                                        >
                                            <Checkbox
                                                checked={isEnabled(
                                                    agentType,
                                                    feature,
                                                )}
                                                onCheckedChange={(checked) =>
                                                    toggle(
                                                        agentType,
                                                        feature,
                                                        checked === true,
                                                    )
                                                }
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

FeaturesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Feature Access',
            href: index(),
        },
    ],
};
