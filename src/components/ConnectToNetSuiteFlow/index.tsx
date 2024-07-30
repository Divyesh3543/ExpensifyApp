import React, {useEffect, useState} from 'react';
import {useOnyx} from 'react-native-onyx';
import * as Expensicons from '@components/Icon/Expensicons';
import PopoverMenu from '@components/PopoverMenu';
import useLocalize from '@hooks/useLocalize';
import useWindowDimensions from '@hooks/useWindowDimensions';
import {getAdminPoliciesConnectedToNetSuite} from '@libs/actions/Policy/Policy';
import Navigation from '@libs/Navigation/Navigation';
import {isControlPolicy} from '@libs/PolicyUtils';
import {useAccountingContext} from '@pages/workspace/accounting/AccountingContext';
import type {AnchorPosition} from '@styles/index';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {ConnectToNetSuiteFlowProps} from './types';

function ConnectToNetSuiteFlow({policyID}: ConnectToNetSuiteFlowProps) {
    const {translate} = useLocalize();
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);

    const hasPoliciesConnectedToNetSuite = !!getAdminPoliciesConnectedToNetSuite()?.length;
    const {isSmallScreenWidth} = useWindowDimensions();
    const [isReuseConnectionsPopoverOpen, setIsReuseConnectionsPopoverOpen] = useState(false);
    const [reuseConnectionPopoverPosition, setReuseConnectionPopoverPosition] = useState<AnchorPosition>({horizontal: 0, vertical: 0});
    const {integrationRefs} = useAccountingContext();

    const threeDotsMenuContainerRef = integrationRefs?.current?.[CONST.POLICY.CONNECTIONS.NAME.NETSUITE];

    const connectionOptions = [
        {
            icon: Expensicons.LinkCopy,
            text: translate('workspace.common.createNewConnection'),
            onSelected: () => {
                Navigation.navigate(ROUTES.POLICY_ACCOUNTING_NETSUITE_TOKEN_INPUT.getRoute(policyID));
                setIsReuseConnectionsPopoverOpen(false);
            },
        },
        {
            icon: Expensicons.Copy,
            text: translate('workspace.common.reuseExistingConnection'),
            onSelected: () => {
                Navigation.navigate(ROUTES.POLICY_ACCOUNTING_NETSUITE_EXISTING_CONNECTIONS.getRoute(policyID));
                setIsReuseConnectionsPopoverOpen(false);
            },
        },
    ];

    useEffect(() => {
        if (!isControlPolicy(policy)) {
            Navigation.navigate(ROUTES.WORKSPACE_UPGRADE.getRoute(policyID, CONST.UPGRADE_FEATURE_INTRO_MAPPING.netsuite.alias));
            return;
        }

        if (!hasPoliciesConnectedToNetSuite) {
            Navigation.navigate(ROUTES.POLICY_ACCOUNTING_NETSUITE_TOKEN_INPUT.getRoute(policyID));
            return;
        }

        if (!isSmallScreenWidth) {
            threeDotsMenuContainerRef?.current?.measureInWindow((x, y, width, height) => {
                setReuseConnectionPopoverPosition({
                    horizontal: x + width,
                    vertical: y + height,
                });
            });
        }
        setIsReuseConnectionsPopoverOpen(true);
        // eslint-disable-next-line react-compiler/react-compiler
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (threeDotsMenuContainerRef) {
        return (
            <PopoverMenu
                isVisible={isReuseConnectionsPopoverOpen}
                onClose={() => {
                    setIsReuseConnectionsPopoverOpen(false);
                }}
                withoutOverlay
                menuItems={connectionOptions}
                onItemSelected={(item) => {
                    if (!item?.onSelected) {
                        return;
                    }
                    item.onSelected();
                }}
                anchorPosition={reuseConnectionPopoverPosition}
                anchorAlignment={{horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.RIGHT, vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.TOP}}
                anchorRef={threeDotsMenuContainerRef}
            />
        );
    }
}

export default ConnectToNetSuiteFlow;
