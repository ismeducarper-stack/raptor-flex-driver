module.exports = {
    dependencies: {
        'react-native-config': {
            platforms: {
                android: {
                    packageImportPath: 'import com.lugg.RNCConfig.RNCConfigPackage;',
                    packageInstance: 'new RNCConfigPackage()',
                },
            },
        },
    },
};
