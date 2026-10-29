<?php

declare(strict_types=1);

namespace App\DataFixtures;

use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class UserFixtures extends Fixture
{
    // Injecte le hashage de mot de passe
    public function __construct(
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    // Crée les utilisateurs par défaut
    public function load(ObjectManager $manager): void
    {
        // Liste des utilisateurs à créer
        $accounts = [
            ['editor@example.test', 'Rédacteur en chef', 'ROLE_EDITOR'],
            ['journalist1@example.test', 'Journaliste 1', 'ROLE_JOURNALIST'],
            ['journalist2@example.test', 'Journaliste 2', 'ROLE_JOURNALIST'],
        ];

        // Crée chaque utilisateur
        foreach ($accounts as [$email, $displayName, $role]) {
            $user = new User();
            $user->setEmail($email);
            $user->setDisplayName($displayName);
            $user->setRoles([$role]);

            $user->setPassword(
                $this->passwordHasher->hashPassword($user, 'password123') // Hash le mot de passe
            );

            $manager->persist($user); // Prepare l'enregistrement de chaque utilisateur
        }

        $manager->flush(); // Enregistre tous les utilisateurs dans PostgreSQL
    }
}
