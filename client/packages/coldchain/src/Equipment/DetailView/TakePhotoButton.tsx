import { Camera, CameraSource, CameraResultType } from "@capacitor/camera";
import { ButtonWithIcon } from "@common/components";
import { PlusCircleIcon } from "@common/icons";
import React from "react";
import { base64ToBlob } from "../utils";
import { useTranslation } from "@common/intl";
import { Box, useNotification } from "packages/common/src";

export const TakePhotoButton = ({
    onUpload,
    files,
}: {
    onUpload: (files: File[]) => void, files: File[]
    | undefined
}) => {
    const t = useTranslation();
    const { error } = useNotification();
    const checkPermissions = async () => {
        const permissionState = await Camera.checkPermissions();
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
        const hasPermission = await checkPermissions();
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


            if (!base64Data) {
                // todo throw error?
                return
            }
            const blob = base64ToBlob(base64Data, contentType);

            // Create a File from the blob
            const fileName = `photo_${new Date().getTime()}.${image.format}`;
            const file = new File([blob], fileName, { type: contentType });

            const newFileSet = files ?? [];
            newFileSet.push(file);
            onUpload(newFileSet);

        } catch (e) {
            error(t('error.photo-error'));
        }
    };

    return (
        <Box sx={{ padding: 0 }} >
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