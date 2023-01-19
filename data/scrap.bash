#!/bin/bash

# Définir le dossier à parcourir
root_dir="."

# Supprimer le fichier all.txt s'il existe
if [ -f all.txt ]; then
    rm all.txt
fi

# Ouvrir un fichier .txt pour écrire tout le contenu des fichiers
touch all.txt

# Parcourir le dossier et tous les sous-dossiers
for dir in $(find $root_dir -type d); do
    # Parcourir tous les fichiers dans chaque dossier
    for file in $(find $dir -type f); do
        # Obtenir le chemin relatif du fichier
        file_path=$(realpath $file | sed "s|$root_dir/||" | sed "s|/Usercheikkone||")
        if [ "$file_path" != "all.txt" ]; then
            # Ajouter le chemin relatif du fichier au début du fichier
            echo "// $file_path " >> all.txt
        fi
    done
done

# Afficher le message "Fini"
echo "Fini"
