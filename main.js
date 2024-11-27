document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소 참조
    const secretKeyInput = document.getElementById('secretKey');
    const dataToEncryptInput = document.getElementById('dataToEncrypt');
    const encryptedResultDisplay = document.getElementById('encryptedResult');
    const dataToDecryptInput = document.getElementById('dataToDecrypt');
    const decryptedResultDisplay = document.getElementById('decryptedResult');

    // 암호화 처리 함수
    function handleEncryption() {
        const secretKey = secretKeyInput.value;
        console.log(secretKey);
        const dataToEncrypt = dataToEncryptInput.value;
        const encryptedData = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(dataToEncrypt), secretKey, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });
        const encryptedText = encryptedData.toString();
        encryptedResultDisplay.textContent = '암호화 결과: ' + encryptedText;
        dataToDecryptInput.value = encryptedText;  // 암호화된 데이터를 복호화 입력 필드에 설정
    }

    // 복호화 처리 함수
    function handleDecryption() {
        const secretKey = secretKeyInput.value;
        const encryptedData = dataToDecryptInput.value;
        try {
            const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, secretKey, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            });
            const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
            
            if (!decryptedText) throw new Error('복호화 실패');
            decryptedResultDisplay.textContent = '복호화 결과: ' + decryptedText;
        } catch (e) {
            decryptedResultDisplay.textContent = e.message;
        }
    }

    // 이벤트 리스너 설정
    document.getElementById('encryptButton').addEventListener('click', handleEncryption);
    document.getElementById('decryptButton').addEventListener('click', handleDecryption);
});