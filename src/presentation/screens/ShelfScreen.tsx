import React, { useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Box, useTheme, radii } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { ManageCoffeesScreen, ShelfPanelHandle } from './ManageCoffeesScreen';
import { ManageGrindersScreen } from './ManageGrindersScreen';

type Segment = 'beans' | 'grinders';

/**
 * Shelf — unifies Beans and Grinders under one tab (Crema direction).
 * A shared header + amber "add" button drives whichever panel is active;
 * each panel still owns its own add/edit sheet and data loading.
 */
export const ShelfScreen = () => {
    const theme = useTheme();
    const [seg, setSeg] = useState<Segment>('beans');
    const coffeeRef = useRef<ShelfPanelHandle>(null);
    const grinderRef = useRef<ShelfPanelHandle>(null);

    const add = () => {
        if (seg === 'beans') coffeeRef.current?.openAdd();
        else grinderRef.current?.openAdd();
    };

    return (
        <Box flex={1} backgroundColor="mainBackground">
            <ScreenHeader
                title="Shelf"
                right={
                    <TouchableOpacity onPress={add} activeOpacity={0.85} hitSlop={8}>
                        <Box
                            width={38}
                            height={38}
                            borderRadius={radii.m}
                            backgroundColor="primary"
                            alignItems="center"
                            justifyContent="center"
                        >
                            <Ionicons name="add" size={24} color={theme.colors.onPrimary} />
                        </Box>
                    </TouchableOpacity>
                }
            >
                <Box marginTop="m">
                    <Segmented
                        options={[
                            { id: 'beans', label: 'Beans' },
                            { id: 'grinders', label: 'Grinders' },
                        ]}
                        value={seg}
                        onChange={setSeg}
                    />
                </Box>
            </ScreenHeader>

            <Box flex={1} style={{ display: seg === 'beans' ? 'flex' : 'none' }}>
                <ManageCoffeesScreen ref={coffeeRef} embedded />
            </Box>
            <Box flex={1} style={{ display: seg === 'grinders' ? 'flex' : 'none' }}>
                <ManageGrindersScreen ref={grinderRef} embedded />
            </Box>
        </Box>
    );
};

export default ShelfScreen;
