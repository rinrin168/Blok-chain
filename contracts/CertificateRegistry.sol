// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertificateRegistry
 * @author [Your Name]
 * @notice Immutable on-chain registry for digital certificate hashes.
 *         Stores a SHA-256 hash of certificate data to enable tamper detection.
 */
contract CertificateRegistry {

    // Data Structures

    struct Certificate {
        string  certificateId;
        bytes32 dataHash;
        address issuedBy;
        uint256 issuedAt;
        bool    isRevoked;
        bool    exists;
    }

    // State Variables

    address public owner;
    uint256 public totalCertificates;

    mapping(string => Certificate) private certificates;

    // Events

    event CertificateIssued(
        string indexed certificateId,
        bytes32 dataHash,
        address indexed issuedBy,
        uint256 issuedAt
    );

    event CertificateRevoked(
        string indexed certificateId,
        uint256 revokedAt
    );

    // Modifiers

    modifier onlyOwner() {
        require(msg.sender == owner, "CertificateRegistry: caller is not owner");
        _;
    }

    modifier certificateExists(string memory certificateId) {
        require(
            certificates[certificateId].exists,
            "CertificateRegistry: certificate not found"
        );
        _;
    }

    modifier certificateNotRevoked(string memory certificateId) {
        require(
            !certificates[certificateId].isRevoked,
            "CertificateRegistry: certificate already revoked"
        );
        _;
    }

    // Constructor

    constructor() {
        owner = msg.sender;
        totalCertificates = 0;
    }

    // Write Functions

    /**
     * @notice Issue a new certificate on-chain.
     * @param certificateId The unique public certificate ID
     * @param dataHash      SHA-256 hash of the certificate's full data
     */
    function storeCertificate(
        string memory certificateId,
        bytes32 dataHash
    ) external onlyOwner {
        require(
            !certificates[certificateId].exists,
            "CertificateRegistry: certificate already exists"
        );

        certificates[certificateId] = Certificate({
            certificateId: certificateId,
            dataHash:       dataHash,
            issuedBy:       msg.sender,
            issuedAt:       block.timestamp,
            isRevoked:      false,
            exists:         true
        });

        totalCertificates += 1;

        emit CertificateIssued(certificateId, dataHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke an existing certificate.
     * @param certificateId The unique public certificate ID to revoke
     */
    function revokeCertificate(string memory certificateId)
        external
        onlyOwner
        certificateExists(certificateId)
        certificateNotRevoked(certificateId)
    {
        certificates[certificateId].isRevoked = true;
        emit CertificateRevoked(certificateId, block.timestamp);
    }

    /**
     * @notice Retrieve a certificate record.
     */
    function getCertificate(string memory certificateId)
        external
        view
        certificateExists(certificateId)
        returns (
            string memory id,
            bytes32 dataHash,
            address issuedBy,
            uint256 issuedAt,
            bool isRevoked
        )
    {
        Certificate memory cert = certificates[certificateId];
        return (
            cert.certificateId,
            cert.dataHash,
            cert.issuedBy,
            cert.issuedAt,
            cert.isRevoked
        );
    }

    /**
     * @notice Check if a certificate ID exists on-chain.
     */
    function certificateExistsOnChain(string memory certificateId)
        external
        view
        returns (bool)
    {
        return certificates[certificateId].exists;
    }

    /**
     * @notice Verify that a given hash matches the stored hash.
     * @return true if hashes match AND certificate is not revoked
     */
    function verifyCertificate(string memory certificateId, bytes32 dataHash)
        external
        view
        certificateExists(certificateId)
        returns (bool)
    {
        Certificate memory cert = certificates[certificateId];
        return (!cert.isRevoked && cert.dataHash == dataHash);
    }
}
