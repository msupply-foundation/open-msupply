import { Camera, CameraSource, CameraResultType } from "@capacitor/camera";
import { ButtonWithIcon } from "@common/components";
import { PlusCircleIcon } from "@common/icons";
import React from "react";
import { base64ToBlob } from "../utils";
import { useTranslation } from "@common/intl";
import { Box } from "packages/common/src";

export const TakePhotoButton = ({
    onUpload,
    files,
}: {
    onUpload: (files: File[]) => void, files: File[]
    | undefined
}) => {
    const t = useTranslation();
    const checkPermissions = async () => {
        console.info('checking permissions')
        const permissionState = await Camera.checkPermissions();
        console.info('permission state', permissionState)
        if (permissionState.camera !== 'granted') {
            const requested = await Camera.requestPermissions();
            if (requested.camera !== 'granted') {
                console.error('Camera permission denied');
                return false;
            }
        }
        return true;
    };

    const takePicture = async () => {
        console.info('taking photo');
        const hasPermission = await checkPermissions();
        console.info('permissions got', hasPermission);
        if (!hasPermission) return;

        try {
            const image = await Camera.getPhoto({
                source: CameraSource.Camera,
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Base64
            });
            const base64Data = image.base64String;
            const contentType = `image/${image.format}`;

            console.info('file', image);

            if (!base64Data) {
                // throw error?
                return
            }
            const blob = base64ToBlob(base64Data, contentType);

            // Create a File from the blob
            const fileName = `photo_${new Date().getTime()}.${image.format}`;
            const file = new File([blob], fileName, { type: contentType });

            console.info('file', file);
            // Can be set to the src of an image now
            const newFileSet = files ?? [];
            newFileSet.push(file);
            onUpload(newFileSet);

            console.info('got image', image);
        } catch (error) {
            console.error('error', error)
        }
    };

    return (
        <Box sx={{ width: '50%', padding: 0 }} >

            <ButtonWithIcon
                Icon={<PlusCircleIcon />}
                label={t('button.camera')}
                onClick={takePicture}
                shouldShrink={false}
                color="secondary"
                variant="outlined"
            />
        </Box>
    )
}